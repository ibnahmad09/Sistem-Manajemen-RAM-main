<?php

if (! function_exists('formatNumberId')) {
    /**
     * Format a number with Indonesian grouping, trimming trailing zeros
     * in the decimal part (e.g. 120.00 -> "120", 120.50 -> "120,5",
     * 120.05 -> "120,05", 1500 -> "1.500").
     */
    function formatNumberId(float|int|string|null $value): string
    {
        $formatted = number_format((float) ($value ?? 0), 2, ',', '.');

        return rtrim(rtrim($formatted, '0'), ',');
    }
}
