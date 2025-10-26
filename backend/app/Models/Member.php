<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'national_id',
        'gender',
        'dob',
        'phone',
        'address',
        'unit',
        'email',
        'membership_type',
        'membership_number',
        'religion',
        'job',
        'photo',
        'status',
        'financial_support',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'dob' => 'date',
        'financial_support' => 'boolean',
    ];
}
