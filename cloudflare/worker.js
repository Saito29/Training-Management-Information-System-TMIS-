import { DurableObject } from 'cloudflare:workers';

const CONTAINER_PORT = 80;
const HEALTH_PATH = '/health';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const REQUIRED_RUNTIME_SECRETS = [
    'APP_KEY',
    'DB_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'MAIL_USERNAME',
    'MAIL_PASSWORD',
];

export class TmisContainer extends DurableObject {
    starting;
    monitoring;

    constructor(ctx, env) {
        super(ctx, env);

        if (ctx.container.running) {
            void ctx.blockConcurrencyWhile(() => ctx.container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS));
            this.observeExit();
        }
    }

    async fetch(request) {
        this.starting ??= this.startAndWaitForPort().finally(() => {
            this.starting = undefined;
        });
        await this.starting;

        const incomingUrl = new URL(request.url);
        const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, 'http://container');
        const forwarded = new Request(upstreamUrl, request);
        const clientIp = request.headers.get('cf-connecting-ip');

        forwarded.headers.delete('host');
        forwarded.headers.set('x-forwarded-host', incomingUrl.host);
        forwarded.headers.set('x-forwarded-proto', incomingUrl.protocol.slice(0, -1));
        forwarded.headers.set('x-forwarded-port', incomingUrl.protocol === 'https:' ? '443' : '80');
        if (clientIp) {
            forwarded.headers.set('x-forwarded-for', clientIp);
        }

        return this.ctx.container.getTcpPort(CONTAINER_PORT).fetch(forwarded);
    }

    async startAndWaitForPort() {
        const missingSecrets = REQUIRED_RUNTIME_SECRETS.filter((key) => !this.env[key]);
        if (missingSecrets.length > 0) {
            throw new Error(`Missing required Worker secrets: ${missingSecrets.join(', ')}`);
        }

        const container = this.ctx.container;
        if (!container.running) {
            container.start({
                image: container.images.base,
                instance: 'basic',
                enableInternet: true,
                env: this.containerEnvironment(),
            });
        }

        this.observeExit();
        await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);

        const port = container.getTcpPort(CONTAINER_PORT);
        let lastError;
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                const response = await port.fetch(`http://container${HEALTH_PATH}`, {
                    signal: AbortSignal.timeout(1000),
                });
                await response.body?.cancel();
                if (response.ok) {
                    return;
                }
                lastError = new Error(`Container health check returned ${response.status}.`);
            } catch (error) {
                lastError = error;
            }
            await scheduler.wait(200);
        }

        throw new Error('TMIS container did not become ready.', { cause: lastError });
    }

    containerEnvironment() {
        const keys = [
            'APP_NAME', 'APP_ENV', 'APP_DEBUG', 'APP_KEY', 'APP_URL', 'APP_TIMEZONE', 'TRUSTED_PROXIES', 'BCRYPT_ROUNDS',
            'LOG_CHANNEL', 'LOG_LEVEL', 'DB_CONNECTION', 'DB_URL', 'DB_SSLMODE', 'SESSION_DRIVER', 'SESSION_LIFETIME',
            'SESSION_ENCRYPT', 'SESSION_SECURE_COOKIE', 'SESSION_SAME_SITE', 'CACHE_STORE', 'QUEUE_CONNECTION',
            'FILESYSTEM_DISK', 'UPLOADS_DISK', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION',
            'AWS_BUCKET', 'AWS_ENDPOINT', 'AWS_USE_PATH_STYLE_ENDPOINT', 'MAIL_MAILER', 'MAIL_HOST', 'MAIL_PORT',
            'MAIL_SCHEME', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS', 'MAIL_FROM_NAME',
            'TMIS_BOOTSTRAP_DATA_KEY',
        ];

        return Object.fromEntries(keys.map((key) => [key, this.env[key] ?? '']));
    }

    observeExit() {
        if (this.monitoring) {
            return;
        }

        this.monitoring = this.ctx.container.monitor()
            .then(() => console.info('TMIS container exited.'))
            .catch(() => console.error('TMIS container exited with an error.'))
            .finally(() => {
                this.monitoring = undefined;
            });
        this.ctx.waitUntil(this.monitoring);
    }
}

export default {
    fetch(request, env) {
        if (REQUIRED_RUNTIME_SECRETS.some((key) => !env[key])) {
            return new Response('TMIS deployment setup is incomplete.', {
                status: 503,
                headers: { 'cache-control': 'no-store' },
            });
        }

        return env.TMIS_CONTAINER.getByName('tmis-production').fetch(request);
    },
};
