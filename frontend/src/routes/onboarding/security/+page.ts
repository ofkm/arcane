import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
    const settings = await settingsAPI.getSettings();
    
    if (settings.onboarding?.completed) {
        throw redirect(302, '/');
    }
    
    return { settings };
};