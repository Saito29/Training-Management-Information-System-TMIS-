import '../../css/auth/auth.css';
import '../../css/shared/toast.css';
import '../shared/toast.js';
import './authentication.js';

if (document.getElementById('email-verification-form')) {
    import('./email-verification.js');
}
