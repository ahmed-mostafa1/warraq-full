<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $memberId = request()->route('member')?->id ?? request()->route('id');

        return [
            'name' => ['required', 'string', 'max:150'],
            'national_id' => [
                'nullable',
                'string',
                Rule::unique('members', 'national_id')->ignore($memberId),
            ],
            'gender' => ['nullable', 'in:male,female,ذكر,أنثى'],
            'religion' => ['nullable', 'in:muslim,christian,مسلم,مسيحي'],
            'dob' => ['nullable', 'date', 'before_or_equal:today'],
            'phone' => ['nullable', 'string', 'max:11'],
            'address' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'unit' => ['nullable', 'string'],
            'membership_type' => ['nullable', 'string'],
            'membership_number' => ['nullable', 'string'],
            'job' => ['nullable', 'string'],
            'photo' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
            'financial_support' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
