<?php

test('formatNumberId trims trailing zeros in the decimal part', function () {
    expect(formatNumberId(120))->toBe('120');
    expect(formatNumberId(120.00))->toBe('120');
    expect(formatNumberId(120.50))->toBe('120,5');
    expect(formatNumberId(120.05))->toBe('120,05');
});

test('formatNumberId groups thousands', function () {
    expect(formatNumberId(1500))->toBe('1.500');
    expect(formatNumberId(1500.50))->toBe('1.500,5');
    expect(formatNumberId(1234567.25))->toBe('1.234.567,25');
});

test('formatNumberId handles zero and null', function () {
    expect(formatNumberId(0))->toBe('0');
    expect(formatNumberId(0.00))->toBe('0');
    expect(formatNumberId(null))->toBe('0');
});
