<?php

namespace App\Http\Controllers;

use App\Services\BackupService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function download(BackupService $backupService): BinaryFileResponse
    {
        $zipPath = $backupService->createZip();

        app()->terminating(fn () => $backupService->cleanup($zipPath));

        return response()->download(
            $zipPath,
            basename($zipPath),
            [
            'Content-Type' => 'application/zip',
            ]
        )->deleteFileAfterSend(true);
    }
}
