<?php

use App\Http\Controllers\BackupController;
use App\Http\Controllers\ExportImportController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\StatsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn() => response()->json(['ok' => true]));

Route::post('/members/import', [ExportImportController::class, 'import']);
Route::get('/members/export', [ExportImportController::class, 'export']);
Route::get('/import-failures/{id}', [ExportImportController::class, 'downloadFailure']);
Route::get('/backup', [BackupController::class, 'download']);
Route::get('/stats', [StatsController::class, 'index']);

Route::apiResource('members', MemberController::class)->parameters([
    'members' => 'member',
]);
