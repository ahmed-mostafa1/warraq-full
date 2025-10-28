<?php

namespace App\Http\Controllers;

use App\Exports\MembersExport;
use App\Imports\MembersImport;
use App\Services\ImportFailureReporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Throwable;

class ExportImportController extends Controller
{
    public function __construct(
        private readonly ImportFailureReporter $failureReporter
    ) {
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:csv,txt,xlsx,xls'],
        ]);

        $import = new MembersImport();

        try {
            Excel::import($import, $request->file('file'));
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'file' => 'Unable to process the uploaded file. ' . $exception->getMessage(),
            ]);
        }

        $failureReportId = null;

        if ($import->getFailureCount() > 0) {
            $failureReportId = $this->failureReporter->store($import->getFailures());
        }

        return response()->json([
            'inserted' => $import->getInsertedCount(),
            'updated' => $import->getUpdatedCount(),
            'failed' => $import->getFailureCount(),
            'warnings' => $import->getWarnings(),
            'failure_report_id' => $failureReportId,
        ]);
    }

    public function export(Request $request)
    {
        $format = strtolower((string) $request->query('format', 'xlsx'));

        if (! in_array($format, ['csv', 'xlsx'], true)) {
            throw ValidationException::withMessages([
                'format' => 'Format must be csv or xlsx.',
            ]);
        }

        $filters = $request->only([
            'search',
            'name',
            'national_id',
            'gender',
            'religion',
            'unit',
            'membership_type',
            'job',
            'status',
        ]);

        $filename = 'members-' . now()->format('Ymd-His') . '.' . $format;
        $writer = $format === 'csv' ? ExcelWriter::CSV : ExcelWriter::XLSX;

        return Excel::download(new MembersExport($filters), $filename, $writer);
    }

    public function downloadFailure(string $id)
    {
        if (! preg_match('/^\d{8}-\d{6}-[A-Za-z0-9]{6}$/', $id)) {
            abort(404);
        }

        $path = $this->failureReporter->path($id);

        if (! Storage::disk('local')->exists($path)) {
            abort(404);
        }

        return Storage::disk('local')->download($path, "import-failures-{$id}.csv");
    }
}
