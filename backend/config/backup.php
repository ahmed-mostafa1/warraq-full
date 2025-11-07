<?php

return [
    'filename_prefix' => 'waraq',
    'filename_date_format' => 'd-m-Y',
    'filename_extension' => '.sqlite',
    'tmp_dir' => storage_path('app/backup_tmp'),
    'db_path' => base_path(env('DB_DATABASE', 'database/database.sqlite')),
    'use_vacuum_into' => (bool) env('BACKUP_USE_VACUUM', true),
];
