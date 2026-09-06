import type { WeighingTransaction } from '@/types';

function fmtAmount(n: number): string {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n);
}

function fmtKg(n: number): string {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(n);
}

function fit(text: string, width: number): string {
    return text.length > width ? text.slice(0, width) : text;
}

/** Label kiri, nilai rata kanan, total = width kolom (monospace). */
function justify(label: string, value: string, width: number): string {
    const content = `${label}${value}`;

    if (content.length > width) {
        return fit(content, width);
    }

    return label + ' '.repeat(width - label.length - value.length) + value;
}

export function buildReceipt(
    encoder: any,
    tx: WeighingTransaction,
    columns = 48,
): Uint8Array {
    const dateStr = new Date(tx.transaction_date).toLocaleDateString('id-ID');
    const timeStr = new Date(tx.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const loads = tx.loads ?? [];

    const big = columns >= 36;

    encoder
        .initialize()

        .align('center')
        .bold(true)
        .size(big ? 2 : 1)
        .text('RAM SAWIT HND JAYA')
        .bold(false)
        .size(1)
        .text('Jl. Parit 1 Siapi-api')
        .text('Telp: 0812-xxxx-xxxx')
        .newline()

        .rule()

        .bold(true)
        .text('NOTA TIMBANGAN SAWIT')
        .bold(false)
        .text(tx.nota_number)
        .newline()

        .rule()

        .align('left')

        .text(justify('TANGGAL: ', dateStr, columns))
        .text(justify('JAM: ', timeStr, columns))
        .text(
            justify(
                'KASIR: ',
                fit(tx.cashier_name_snapshot, columns - 8),
                columns,
            ),
        )
        .bold(true)
        .text(
            justify(
                'PETANI: ',
                fit(tx.farmer_name_snapshot, columns - 9),
                columns,
            ),
        )
        .bold(false)
        .newline()

        .rule();

    if (loads.length) {
        encoder.bold(true).text('RINCIAN MUATAN').bold(false);
        loads.forEach((load) => {
            encoder.text(
                justify(
                    `#${load.seq_no} BRUTO: `,
                    `${fmtKg(load.gross_weight)} kg`,
                    columns,
                ),
            );
            encoder.text(
                justify(
                    `#${load.seq_no} TARE: `,
                    `${fmtKg(load.tare_weight)} kg`,
                    columns,
                ),
            );

            if (load.has_sorting) {
                encoder.text(
                    justify(
                        `#${load.seq_no} SORTIRAN: `,
                        `-${fmtKg(load.sorting_weight)} kg`,
                        columns,
                    ),
                );
            }

            encoder
                .bold(true)
                .text(
                    justify(
                        `#${load.seq_no} NETTO: `,
                        `${fmtKg(load.net_weight)} kg`,
                        columns,
                    ),
                )
                .bold(false);
        });
        encoder.newline();
    } else {
        encoder.text(
            justify('BRUTO: ', `${fmtKg(tx.gross_weight)} kg`, columns),
        );
        encoder.text(
            justify('TARE (MOBIL): ', `${fmtKg(tx.tare_weight)} kg`, columns),
        );
        encoder
            .bold(true)
            .text(
                justify(
                    'NETTO KOTOR: ',
                    `${fmtKg(tx.initial_weight)} kg`,
                    columns,
                ),
            )
            .bold(false);
        encoder.newline();
    }

    if (tx.has_deduction) {
        encoder.text(
            justify(
                `POTONGAN (${tx.deduction_percentage}%): `,
                `-${fmtKg(tx.deduction_weight)} kg`,
                columns,
            ),
        );
    }

    return encoder
        .bold(true)
        .text(justify('NETTO BERSIH: ', `${fmtKg(tx.net_weight)} kg`, columns))
        .bold(false)

        .newline()

        .text(justify('HARGA/KG: ', fmtAmount(tx.palm_price_per_kg), columns))
        .bold(true)
        .text(
            justify('TOTAL SAWIT: ', fmtAmount(tx.palm_total_amount), columns),
        )
        .bold(false)

        .newline()

        .rule()

        .align('center')
        .bold(true)
        .size(big ? 2 : 1)
        .text('TOTAL DITERIMA')
        .text(`Rp ${fmtAmount(tx.final_paid_amount_rounded)}`)
        .bold(false)
        .size(1)
        .text(
            `METODE: ${tx.payment_method === 'cash' ? 'TUNAI' : 'TRANSFER BANK'}`,
        )

        .newline()
        .newline()

        .align('left')
        .text(fit('NB: Harap hitung kembali uang', columns))
        .text(fit('anda, kami tidak menerima', columns))
        .text(fit('komplain saat sudah keluar', columns))
        .text(fit('dari RAMP.', columns))

        .newline()
        .newline()

        .cut()

        .encode();
}
