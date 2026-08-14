import { formatRupiah, formatKg } from '@/lib/utils';
import type { WeighingTransaction } from '@/types';

export function buildReceipt(encoder: any, tx: WeighingTransaction): Uint8Array {
    const dateStr = new Date(tx.transaction_date).toLocaleDateString('id-ID');
    const timeStr = new Date(tx.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });

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

        .text(`BRUTO: ${formatKg(tx.gross_weight)}`)
        .text(`TARE (MOBIL): ${formatKg(tx.tare_weight)}`)
        .bold(true)
        .text(`NETTO KOTOR: ${formatKg(tx.initial_weight)}`)
        .bold(false)

        .newline()

        .text(`HARGA/KG: ${new Intl.NumberFormat('id-ID').format(tx.palm_price_per_kg)}`)
        .bold(true)
        .text(`TOTAL SAWIT: ${new Intl.NumberFormat('id-ID').format(tx.palm_total_amount)}`)
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
        .text(`METODE: ${tx.payment_method === 'cash' ? 'TUNAI' : 'TRANSFER BANK'}`)

        .newline()
        .newline()
        .newline()

        .cut()

        .encode();
}
