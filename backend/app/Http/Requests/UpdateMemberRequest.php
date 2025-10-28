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

    /**
     * Get the validation error messages for the defined rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'الاسم مطلوب.',
            'name.max' => 'يجب ألا يزيد الاسم عن 150 حرفاً.',
            'national_id.unique' => 'هذا الرقم القومي مستخدم بالفعل.',
            'gender.in' => 'قيمة الحقل النوع غير صالحة.',
            'religion.in' => 'قيمة الحقل الديانة غير صالحة.',
            'dob.date' => 'يجب إدخال تاريخ ميلاد صحيح.',
            'dob.before_or_equal' => 'تاريخ الميلاد يجب أن يكون في الماضي.',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح.',
            'phone.max' => 'رقم الهاتف يجب ألا يزيد عن 11 رقماً.',
        ];
    }
}
