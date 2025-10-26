<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class BackupService
{
    public function createZip(): string
    {
        $dbPath = config('backup.db_path');

        if (empty($dbPath) || ! file_exists($dbPath)) {
            throw new RuntimeException('Database file not found at path: ' . $dbPath);
        }

        $tmpBase = rtrim(config('backup.tmp_dir'), DIRECTORY_SEPARATOR);
        if (! is_dir($tmpBase)) {
            if (! mkdir($tmpBase, 0755, true) && ! is_dir($tmpBase)) {
                throw new RuntimeException('Unable to create backup temp directory: ' . $tmpBase);
            }
        }

        $timestamp = now();
        $subDir = $tmpBase . DIRECTORY_SEPARATOR . 'backup_' . $timestamp->format('Ymd_His') . '_' . Str::lower(Str::random(5));

        if (! mkdir($subDir, 0755, true) && ! is_dir($subDir)) {
            throw new RuntimeException('Unable to create backup working directory: ' . $subDir);
        }

        $sqliteCopy = $subDir . DIRECTORY_SEPARATOR . 'database.sqlite';

        try {
            $this->createSQLiteCopy($dbPath, $sqliteCopy);
        } catch (RuntimeException $exception) {
            $this->cleanupDirectory($subDir);
            throw $exception;
        }

        $zipFilename = $timestamp->format(config('backup.filename_pattern', 'warraq-Ymd-Hi.zip'));
        $zipPath = $subDir . DIRECTORY_SEPARATOR . $zipFilename;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE) !== true) {
            $this->cleanupDirectory($subDir);
            throw new RuntimeException('Unable to create zip archive at: ' . $zipPath);
        }

        $zip->addFile($sqliteCopy, 'database.sqlite');
        $zip->setArchiveComment('Warraq backup created at ' . $timestamp->toIso8601String());
        $zip->close();

        return $zipPath;
    }

    public function cleanup(string $zipPath): void
    {
        $directory = dirname($zipPath);
        $this->cleanupDirectory($directory);
    }

    protected function createSQLiteCopy(string $source, string $destination): void
    {
        $useVacuum = config('backup.use_vacuum_into', true);

        if ($useVacuum) {
            try {
                $this->runVacuumInto($destination);
                if (file_exists($destination)) {
                    return;
                }
                Log::warning('VACUUM INTO completed but destination file missing; falling back to file copy.', ['destination' => $destination]);
            } catch (\Throwable $throwable) {
                Log::warning('VACUUM INTO failed; falling back to file copy.', [
                    'error' => $throwable->getMessage(),
                ]);
            }
        }

        if (! copy($source, $destination)) {
            throw new RuntimeException('Failed to copy database file to backup location.');
        }
    }

    protected function runVacuumInto(string $destination): void
    {
        $pdo = DB::connection()->getPdo();
        $statement = $pdo->prepare('VACUUM INTO :path');
        if (! $statement->execute([':path' => $destination])) {
            throw new RuntimeException('VACUUM INTO execution failed.');
        }
    }

    protected function cleanupDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $files = scandir($directory);
        if ($files === false) {
            return;
        }

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $file;
            if (is_dir($path)) {
                $this->cleanupDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}
