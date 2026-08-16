import { formatRupiah, formatKg } from '@/lib/utils';
import type { WeighingTransaction } from '@/types';

export function buildReceipt(
    encoder: any,
    tx: WeighingTransaction,
): Uint8Array {
    const dateStr = new Date(tx.transaction_date).toLocaleDateString('id-ID');
    const timeStr = new Date(tx.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const loads = tx.loads ?? [];

    return encoder
        .initialize()

        .align('center')
        .bold(true)
        .size(2)
        .text('RAM SAWIT HND JAYA')
        .bold(false)
        .size(0)
        .text('Jl. Perkebunan Sawit No. 1')
        .text('Telp: 0812-xxxx-xxxx')
        .newline()

        .drawLine()

        .bold(true)
        .text('NOTA TIMBANGAN SAWIT')
        .bold(false)
        .text(tx.nota_number)
        .newline()

        .drawLine()

        .align('left')

        .text(`TANGGAL: ${dateStr}`)
        .text(`JAM: ${timeStr}`)
        .text(`KASIR: ${tx.cashier_name_snapshot}`)
        .bold(true)
        .text(`PETANI: ${tx.farmer_name_snapshot}`)
        .bold(false)
        .newline()

        .drawLine()

        .align('left');

    if (loads.length) {
        encoder.bold(true).text('RINCIAN MUATAN').bold(false);
        loads.forEach((load) => {
            encoder.text(
                `#${load.seq_no} BRUTO: ${formatKg(load.gross_weight)}`,
            );
            encoder.text(`#${load.seq_no} TARE: ${formatKg(load.tare_weight)}`);

            if (load.has_sorting) {
                encoder.text(
                    `#${load.seq_no} SORTIRAN: -${formatKg(load.sorting_weight)}`,
                );
            }

            encoder
                .bold(true)
                .text(`#${load.seq_no} NETTO: ${formatKg(load.net_weight)}`)
                .bold(false);
        });
        encoder.newline();
    } else {
        encoder.text(`BRUTO: ${formatKg(tx.gross_weight)}`);
        encoder.text(`TARE (MOBIL): ${formatKg(tx.tare_weight)}`);
        encoder
            .bold(true)
            .text(`NETTO KOTOR: ${formatKg(tx.initial_weight)}`)
            .bold(false);
        encoder.newline();
    }

    if (tx.has_deduction) {
        encoder.text(
            `POTONGAN (${tx.deduction_percentage}%): -${formatKg(tx.deduction_weight)}`,
        );
    }

    encoder
        .bold(true)
        .text(`NETTO BERSIH: ${formatKg(tx.net_weight)}`)
        .bold(false);

    encoder
        .newline()

        .text(
            `HARGA/KG: ${new Intl.NumberFormat('id-ID').format(tx.palm_price_per_kg)}`,
        )
        .bold(true)
        .text(
            `TOTAL SAWIT: ${new Intl.NumberFormat('id-ID').format(tx.palm_total_amount)}`,
        )
        .bold(false)

        .newline()

        .drawLine()

        .align('center')
        .bold(true)
        .size(2)
        .text('TOTAL DITERIMA')
        .text(formatRupiah(tx.final_paid_amount_rounded))
        .bold(false)
        .size(0)
        .text(
            `METODE: ${tx.payment_method === 'cash' ? 'TUNAI' : 'TRANSFER BANK'}`,
        )

        .newline()
        .newline()

        .align('left')
        .text('NB: Harap hitung kembali Bang')
        .text('anda, kami tidak menerima')
        .text('komplain saat sudah keluar')
        .text('dari RAMP.')

        .newline()
        .newline()

        .cut()

        .encode();
}
