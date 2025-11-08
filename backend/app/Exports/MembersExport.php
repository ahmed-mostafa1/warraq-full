<?php

namespace App\Exports;

use App\Models\Member;
use App\Support\MemberFilters;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class MembersExport extends DefaultValueBinder implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, WithCustomValueBinder
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function __construct(
        private readonly array $filters = [],
        private readonly string $format = 'xlsx',
    )
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
    }

    /**
     * @param  Member  $member
     */
    public function map($member): array
    {
        return [
            $member->name,
            $this->formatNationalId($member->national_id),
            $member->gender,
            optional($member->dob)->format('Y-m-d'),
            $member->phone,
            $member->address,
            $member->unit,
            $member->email,
            $member->membership_type,
            $member->membership_number,
            $member->religion,
            $member->job,
            $member->photo,
            $member->status,
            $member->financial_support ? 1 : 0,
            $member->notes,
        ];
    }

    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT,
        ];
    }

    public function bindValue(Cell $cell, $value): bool
    {
        if ($cell->getColumn() === 'B') {
            $cell->setValueExplicit($value ?? '', DataType::TYPE_STRING);

            return true;
        }

        return parent::bindValue($cell, $value);
    }

    private function formatNationalId(?string $nationalId): string
    {
        if ($nationalId === null || $nationalId === '') {
            return '';
        }

        if ($this->format === 'csv') {
            return '="' . $nationalId . '"';
        }

        return $nationalId;
    }
}
