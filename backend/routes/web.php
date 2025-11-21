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

$serveSpa = static function () {
    $indexPath = public_path('index.html');

    if (File::exists($indexPath)) {
        return response()->file($indexPath);
    }

    return view('welcome');
};

Route::get('/', $serveSpa);

Route::get('/{any}', function (string $any) use ($serveSpa) {
    if (str_contains($any, '..')) {
        abort(404);
    }

    if (str_contains($any, '.')) {
        $candidatePath = public_path($any);
        $resolvedPath = realpath($candidatePath);
        $publicRoot = realpath(public_path());

        if (
            $resolvedPath !== false &&
            $publicRoot !== false &&
            str_starts_with($resolvedPath, $publicRoot) &&
            is_file($resolvedPath)
        ) {
            return response()->file($resolvedPath);
        }

        abort(404);
    }

    return $serveSpa();
})->where('any', '^(?!api/).*');
