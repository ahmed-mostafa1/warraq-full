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
            'national_id.min' => 'الرقم القومي يجب أن يتكون من 14 رقماً.',
            'national_id.max' => 'الرقم القومي يجب أن يتكون من 14 رقماً.',
            'gender.in' => 'قيمة الحقل النوع غير صالحة.',
            'religion.in' => 'قيمة الحقل الديانة غير صالحة.',
            'dob.date' => 'يجب إدخال تاريخ ميلاد صحيح.',
            'dob.before_or_equal' => 'تاريخ الميلاد يجب أن يكون في الماضي.',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح.',
        ];
    }

}
