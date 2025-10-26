<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('status', 20)
                ->default('active')
                ->after('membership_type');
            $table->boolean('financial_support')
                ->default(false)
                ->after('status');
            $table->text('notes')
                ->nullable()
                ->after('financial_support');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['notes', 'financial_support', 'status']);
        });
    }
};
