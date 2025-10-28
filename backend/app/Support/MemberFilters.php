<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;

class MemberFilters
{
    /**
     * Apply request-like filters to the member query.
     *
     * @param  Builder  $query
     * @param  array<string, mixed>  $filters
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        $search = self::stringValue($filters, 'search');
        if ($search !== null) {
            $query->where(function (Builder $subQuery) use ($search) {
                $subQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('national_id', 'like', "%{$search}%");
            });
        }

        $name = self::stringValue($filters, 'name');
        if ($name !== null) {
            $query->where('name', 'like', "%{$name}%");
        }

        $nationalId = self::stringValue($filters, 'national_id');
        if ($nationalId !== null) {
            $query->where('national_id', 'like', "%{$nationalId}%");
        }

        $unit = self::stringValue($filters, 'unit');
        if ($unit !== null) {
            $query->where('unit', 'like', "%{$unit}%");
        }

        $status = self::stringValue($filters, 'status');
        if ($status !== null) {
            $query->where('status', $status);
        }

        $membershipType = self::stringValue($filters, 'membership_type');
        if ($membershipType !== null) {
            $query->where('membership_type', $membershipType);
        }

        $gender = self::normalizeGender(self::stringValue($filters, 'gender'));
        if ($gender !== null) {
            $query->where('gender', $gender);
        }

        $religion = self::normalizeReligion(self::stringValue($filters, 'religion'));
        if ($religion !== null) {
            $query->where('religion', $religion);
        }

        $job = self::stringValue($filters, 'job');
        if ($job !== null) {
            $query->where('job', 'like', "%{$job}%");
        }

        return $query;
    }

    private static function stringValue(array $filters, string $key): ?string
    {
        if (! Arr::has($filters, $key)) {
            return null;
        }

        $value = Arr::get($filters, $key);
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }

    private static function normalizeGender(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return match (mb_strtolower($value)) {
            'male', 'ذكر', 'm' => 'ذكر',
            'female', 'أنثى', 'انثى', 'f' => 'أنثى',
            default => $value,
        };
    }

    private static function normalizeReligion(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return match (mb_strtolower($value)) {
            'muslim', 'مسلم' => 'مسلم',
            'christian', 'مسيحي', 'مسيحيه' => 'مسيحي',
            default => $value,
        };
    }
}
