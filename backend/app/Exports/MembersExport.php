<?php

namespace App\Exports;

use App\Models\Member;
use App\Support\MemberFilters;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MembersExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function __construct(private readonly array $filters = [])
    {
    }

    /**
     * Expose filters primarily for testing purposes.
     *
     * @return array<string, mixed>
     */
    public function getFilters(): array
    {
        return $this->filters;
    }

    public function collection(): Collection
    {
        $query = Member::query()->orderBy('id');

        MemberFilters::apply($query, $this->filters);

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'name',
            'national_id',
            'gender',
            'dob',
            'phone',
            'address',
            'unit',
            'membership_type',
            'status',
            'financial_support',
            'notes',
        ];
    }

    /**
     * @param  Member  $member
     */
    public function map($member): array
    {
        return [
            $member->name,
            $member->national_id,
            $member->gender,
            optional($member->dob)->format('Y-m-d'),
            $member->phone,
            $member->address,
            $member->unit,
            $member->membership_type,
            $member->status,
            $member->financial_support ? 1 : 0,
            $member->notes,
        ];
    }
}
