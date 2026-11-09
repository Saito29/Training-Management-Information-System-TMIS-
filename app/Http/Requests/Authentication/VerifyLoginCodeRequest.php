<?php

namespace App\Http\Requests\Authentication;

use Illuminate\Foundation\Http\FormRequest;

class VerifyLoginCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['verification_code' => ['required', 'string', $this->session()->get('login_challenge.method') === 'authenticator' ? 'regex:/\A(?:[0-9]{6}|[a-f0-9]{10}-[a-f0-9]{10})\z/i' : 'regex:/\A[0-9]{6}\z/']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'verification_code.required' => 'Enter the 6-digit verification code.',
            'verification_code.regex' => $this->session()->get('login_challenge.method') === 'authenticator' ? 'Enter a current six-digit app code or a valid recovery code.' : 'Enter a valid 6-digit verification code.',
        ];
    }
}
