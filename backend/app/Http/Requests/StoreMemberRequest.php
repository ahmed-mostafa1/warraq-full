<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:150'],
            'national_id' => ['nullable', 'string', 'min:14', 'max:14', 'unique:members,national_id'],
            'gender' => ['nullable', 'in:male,female,ذكر,أنثى'],
            'religion' => ['nullable', 'in:muslim,christian,مسلم,مسيحي'],
            'dob' => ['nullable', 'date', 'before_or_equal:today'],
            'phone' => ['nullable', 'string', 'max:30'],
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
