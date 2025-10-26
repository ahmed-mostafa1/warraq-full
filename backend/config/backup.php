<?php

return [
    'filename_pattern' => 'warraq-Ymd-Hi.zip',
    'tmp_dir' => storage_path('app/backup_tmp'),
    'db_path' => config('database.connections.sqlite.database'),
    'use_vacuum_into' => (bool) env('BACKUP_USE_VACUUM', true),
];
