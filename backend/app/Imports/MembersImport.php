<?php

namespace App\Imports;

use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Row;
use Maatwebsite\Excel\Validators\Failure;

class MembersImport implements OnEachRow, WithHeadingRow, SkipsOnFailure, SkipsEmptyRows
{
    use SkipsFailures;

    public const COLUMNS = [
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

    protected int $inserted = 0;

    protected int $updated = 0;

    protected array $detailedFailures = [];

    protected array $warnings = [];

    protected array $seenNationalIds = [];

    public function onRow(Row $row): void
    {
        $rowNumber = $row->getIndex();
        $raw = $row->toArray();

        $normalized = $this->normalizeRow($raw);

        $existing = null;
        if (! empty($normalized['national_id']) && is_string($normalized['national_id'])) {
            $existing = Member::where('national_id', $normalized['national_id'])->first();
        }

        $validator = Validator::make(
            $normalized,
            $this->rules($existing?->id),
            [],
            $this->attributes()
        );

        if ($validator->fails()) {
            $this->recordFailure($rowNumber, $validator->errors()->keys(), $validator->errors()->all(), $normalized);

            return;
        }

        if (! empty($normalized['national_id'])) {
            $key = strtolower((string) $normalized['national_id']);
            if (isset($this->seenNationalIds[$key])) {
                $this->recordFailure(
                    $rowNumber,
                    ['national_id'],
                    ['Duplicate national_id within import file.'],
                    $normalized
                );

                return;
            }
            $this->seenNationalIds[$key] = true;
        }

        $payload = Arr::only($normalized, self::COLUMNS);
        $payload['gender'] = $this->mapGenderForStorage($payload['gender'] ?? null);
        $payload['financial_support'] = (bool) ($payload['financial_support'] ?? false);

        if ($existing) {
            $existing->fill($payload);
            $existing->save();
            $this->updated++;
        } else {
            Member::create($payload);
            $this->inserted++;
        }
    }

    public function getInsertedCount(): int
    {
        return $this->inserted;
    }

    public function getUpdatedCount(): int
    {
        return $this->updated;
    }

    public function getFailureCount(): int
    {
        return count($this->detailedFailures);
    }

    public function getFailures(): array
    {
        return $this->detailedFailures;
    }

    public function getWarnings(): array
    {
        return $this->warnings;
    }

    protected function rules(?int $currentMemberId): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'national_id' => [
                'nullable',
                'string',
                Rule::unique('members', 'national_id')->ignore($currentMemberId),
            ],
            'gender' => ['nullable', 'in:male,female'],
            'dob' => ['nullable', 'date', 'before_or_equal:today'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'unit' => ['nullable', 'string'],
            'membership_type' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
            'financial_support' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }

    protected function attributes(): array
    {
        return [
            'national_id' => 'national_id',
            'membership_type' => 'membership_type',
            'financial_support' => 'financial_support',
        ];
    }

    protected function normalizeRow(array $row): array
    {
        $normalized = [];

        foreach (self::COLUMNS as $column) {
            $value = $row[$column] ?? null;

            if (is_string($value)) {
                $value = preg_replace('/\s+/u', ' ', trim($value));
                if ($value === '') {
                    $value = null;
                }
            }

            $normalized[$column] = $value;
        }

        $normalized['gender'] = $this->normalizeGender($normalized['gender']);
        $normalized['status'] = $this->normalizeStatus($normalized['status']);
        $normalized['dob'] = $this->normalizeDate($normalized['dob']);
        $normalized['financial_support'] = $this->normalizeBoolean($normalized['financial_support'] ?? null);

        return $normalized;
    }

    protected function normalizeGender(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = mb_strtolower((string) $value);

        return match ($normalized) {
            'male', 'm', 'ذكر', 'ذ' => 'male',
            'female', 'f', 'أنثى', 'انثى', 'أ', 'ا' => 'female',
            default => null,
        };
    }

    protected function normalizeStatus(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'active';
        }

        $status = strtolower((string) $value);

        return $status ?: 'active';
    }

    protected function normalizeDate(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->format('Y-m-d');
        } catch (\Throwable $throwable) {
            return $value;
        }
    }

    protected function normalizeBoolean(mixed $value): bool|string|null
    {
        if ($value === null || $value === '') {
            return false;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            if (in_array($normalized, ['1', 'true'], true)) {
                return true;
            }

            if (in_array($normalized, ['0', 'false'], true)) {
                return false;
            }
        }

        return $value;
    }

    protected function recordFailure(int $rowNumber, array $errorFields, array $messages, array $data): void
    {
        $columnsData = Arr::only($data, self::COLUMNS);
        $uniqueFields = array_values(array_unique($errorFields));
        $primaryField = (string) ($uniqueFields[0] ?? 'row');

        $columnsData['gender'] = $this->mapGenderForStorage($columnsData['gender'] ?? null);

        $this->detailedFailures[] = [
            'row_number' => $rowNumber,
            'error_fields' => $uniqueFields,
            'error_messages' => $messages,
            'data' => $columnsData,
        ];

        $this->onFailure(new Failure(
            $rowNumber,
            $primaryField,
            $messages,
            $columnsData
        ));
    }

    protected function mapGenderForStorage(?string $gender): ?string
    {
        return match ($gender) {
            'male' => 'ذكر',
            'female' => 'أنثى',
            default => $gender,
        };
    }
}
