<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA fallback routes
|--------------------------------------------------------------------------
| Serve the compiled React application for any non-API request so that
| client-side routing works with deep links. We deliberately exclude
| paths starting with "api/" so backend endpoints keep working.
*/

Route::get('/', function () {
    $indexPath = public_path('index.html');

    if (File::exists($indexPath)) {
        return response()->file($indexPath);
    }

    return view('welcome');
});

Route::get('/{any}', function () {
    $indexPath = public_path('index.html');

    if (File::exists($indexPath)) {
        return response()->file($indexPath);
    }

    abort(404);
})->where('any', '^(?!api/).*');
