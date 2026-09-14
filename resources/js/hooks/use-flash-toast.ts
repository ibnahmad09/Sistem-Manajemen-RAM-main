import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('success', (event) => {
            const page = (event as CustomEvent).detail?.page;
            const flash = page?.props?.flash as
                | { success?: string | null; error?: string | null }
                | undefined;

            if (flash?.success) {
                toast.success(flash.success);
            } else if (flash?.error) {
                toast.error(flash.error);
            }
        });
    }, []);
}
