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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('national_id')->nullable()->unique();
            $table->enum('gender', ['ذكر', 'أنثى'])->nullable();
            $table->enum('religion', ['مسلم', 'مسيحي'])->nullable();
            $table->date('dob')->nullable();
            $table->string('phone', 11)->nullable();
            $table->string('address')->nullable();
            $table->string('email')->nullable();
            $table->string('unit')->nullable();
            $table->string('membership_type')->nullable();
            $table->string('membership_number')->nullable();
            $table->string('job')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
