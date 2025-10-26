<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportFailureReporter
{
    protected const DIRECTORY = 'import_failures';

    /**
     * Persist failures as CSV and return the report identifier.
     *
     * @param  array<int, array<string, mixed>>  $failures
     */
    public function store(array $failures): string
    {
        $id = now()->format('Ymd-His') . '-' . Str::lower(Str::random(6));
        $path = $this->path($id);

        Storage::disk('local')->makeDirectory(self::DIRECTORY);
        Storage::disk('local')->put($path, $this->toCsv($failures));

        return $id;
    }

    public function path(string $id): string
    {
        return self::DIRECTORY . '/' . $id . '.csv';
    }

    /**
     * @param  array<int, array<string, mixed>>  $failures
     */
    protected function toCsv(array $failures): string
    {
        $handle = fopen('php://temp', 'w+');

        fputcsv($handle, [
            'row_number',
            'error_fields',
            'error_messages',
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
        ]);

        foreach ($failures as $failure) {
            $data = $failure['data'] ?? [];
            $financialSupport = $data['financial_support'] ?? '';

            if ($financialSupport === true) {
                $financialSupport = '1';
            } elseif ($financialSupport === false) {
                $financialSupport = '0';
            }

            fputcsv($handle, [
                $failure['row_number'] ?? '',
                implode(';', $failure['error_fields'] ?? []),
                implode(' | ', $failure['error_messages'] ?? []),
                $data['name'] ?? '',
                $data['national_id'] ?? '',
                $data['gender'] ?? '',
                $data['dob'] ?? '',
                $data['phone'] ?? '',
                $data['address'] ?? '',
                $data['unit'] ?? '',
                $data['membership_type'] ?? '',
                $data['status'] ?? '',
                $financialSupport,
                $data['notes'] ?? '',
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle) ?: '';
        fclose($handle);

        return $csv;
    }

}
