<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(
        private readonly BackupService $backupService
    ) {
    }

    public function download(): BinaryFileResponse
    {
        $snapshotPath = $this->backupService->createSnapshot();

        app()->terminating(fn () => $this->backupService->cleanup($snapshotPath));

        return response()->download(
            $snapshotPath,
            basename($snapshotPath),
            [
                'Content-Type' => 'application/octet-stream',
            ]
        )->deleteFileAfterSend(true);
    }

    public function restore(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:30240'],
        ]);

        $file = $request->file('file');
        if ($file === null) {
            throw ValidationException::withMessages([
                'file' => 'Backup snapshot file is required.',
            ]);
        }

        if (! $this->hasSqliteExtension($file)) {
            throw ValidationException::withMessages([
                'file' => 'Please upload a valid SQLite backup (.sqlite).',
            ]);
        }

        $summary = $this->restoreFromSnapshot($file, Member::count());

        return response()->json($summary);
    }

    protected function restoreFromSnapshot(UploadedFile $file, int $previousCount): array
    {
        $dbPath = config('backup.db_path');
        $connection = config('database.default');

        if (! is_writable(dirname($dbPath))) {
            throw ValidationException::withMessages([
                'file' => 'Database directory is not writable.',
            ]);
        }

        DB::disconnect($connection);
        DB::purge($connection);

        if (! @copy($file->getRealPath(), $dbPath)) {
            throw ValidationException::withMessages([
                'file' => 'Unable to apply SQLite snapshot. Please try again.',
            ]);
        }

        @chmod($dbPath, 0644);

        DB::reconnect($connection);

        $currentCount = Member::count();

        return [
            'previous_count' => $previousCount,
            'inserted' => $currentCount,
            'total' => $currentCount,
            'warnings' => [],
        ];
    }

    protected function hasSqliteExtension(UploadedFile $file): bool
    {
        $originalExtension = strtolower((string) $file->getClientOriginalExtension());

        if ($originalExtension === 'sqlite') {
            return true;
        }

        $pathExtension = strtolower(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));

        return $pathExtension === 'sqlite';
    }
}
