
import { useState, useEffect } from 'react';
import { CreateEntryPayload, DecryptedEntry } from '../types';
import { useStore } from '../store/useStore';

// Mapping of common service names to their URLs
const SERVICE_DOMAINS: Record<string, string> = {
    // Social & Tech
    'facebook': 'https://facebook.com',
    'fb': 'https://facebook.com',
    'google': 'https://google.com',
    'gmail': 'https://google.com',
    'youtube': 'https://youtube.com',
    'twitter': 'https://twitter.com',
    'x': 'https://x.com',
    'instagram': 'https://instagram.com',
    'linkedin': 'https://linkedin.com',
    'github': 'https://github.com',
    'tiktok': 'https://tiktok.com',
    'discord': 'https://discord.com',
    'reddit': 'https://reddit.com',
    'pinterest': 'https://pinterest.com',
    'twitch': 'https://twitch.tv',
    'whatsapp': 'https://whatsapp.com',
    'telegram': 'https://telegram.org',
    'slack': 'https://slack.com',
    'zoom': 'https://zoom.us',
    'microsoft': 'https://microsoft.com',
    'apple': 'https://apple.com',
    'amazon': 'https://amazon.com',
    'netflix': 'https://netflix.com',
    'spotify': 'https://spotify.com',
    'dropbox': 'https://dropbox.com',
    'adobe': 'https://adobe.com',
    'chatgpt': 'https://chat.openai.com',
    'openai': 'https://openai.com',
    'claude': 'https://claude.ai',
    'notion': 'https://notion.so',
    'figma': 'https://figma.com',
    'canva': 'https://canva.com',
    
    // Crypto & Finance
    'binance': 'https://binance.com',
    'coinbase': 'https://coinbase.com',
    'paypal': 'https://paypal.com',
    'stripe': 'https://stripe.com',
    'metamask': 'https://metamask.io',
    
    // Vietnam Specific
    'zalo': 'https://chat.zalo.me',
    'shopee': 'https://shopee.vn',
    'tiki': 'https://tiki.vn',
    'lazada': 'https://lazada.vn',
    'momo': 'https://momo.vn',
    'vng': 'https://vng.com.vn',
    'vnexpress': 'https://vnexpress.net',
    'zing': 'https://zingnews.vn',
    'vcb': 'https://vcb_digibank.vietcombank.com.vn',
    'vietcombank': 'https://vcb_digibank.vietcombank.com.vn',
    'techcombank': 'https://techcombank.com.vn',
    'mbbank': 'https://mbbank.com.vn',
    'vpbank': 'https://vpbank.com.vn',
};

interface UseEntryFormProps {
    entryToEdit?: DecryptedEntry | null;
    isOpen: boolean;
    onSave: (data: CreateEntryPayload) => Promise<void>;
    onSuccess: () => void;
}

export const useEntryForm = ({ entryToEdit, isOpen, onSave, onSuccess }: UseEntryFormProps) => {
    const { addToast } = useStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState<CreateEntryPayload>({
        service_name: '',
        username: '',
        url: '',
        password: '',
        category: 'Other',
        notes: ''
    });

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [isUrlManuallyEdited, setIsUrlManuallyEdited] = useState(false);
    
    // Generator State
    const [showGenerator, setShowGenerator] = useState(false);
    const [genLength, setGenLength] = useState(16);
    const [includeNum, setIncludeNum] = useState(true);
    const [includeSym, setIncludeSym] = useState(true);
    const [generatedPass, setGeneratedPass] = useState('');

    // Reset or Populate state when opening
    useEffect(() => {
        if (isOpen) {
            if (entryToEdit) {
                setFormData({
                    service_name: entryToEdit.service_name,
                    username: entryToEdit.username || '',
                    url: entryToEdit.url || '',
                    password: entryToEdit.password,
                    category: entryToEdit.category,
                    notes: entryToEdit.notes || ''
                });
                setIsUrlManuallyEdited(true);
            } else {
                setFormData({
                    service_name: '',
                    username: '',
                    url: '',
                    password: '',
                    category: 'Other',
                    notes: ''
                });
                setIsUrlManuallyEdited(false);
            }
            setShowGenerator(false);
            setShowPassword(false);
        }
    }, [isOpen, entryToEdit]);

    // Password Generator Logic
    useEffect(() => {
        if (showGenerator) {
            generatePassword();
        }
    }, [genLength, includeNum, includeSym, showGenerator]);

    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let charset = chars;
        if (includeNum) charset += nums;
        if (includeSym) charset += syms;

        let pass = '';
        const required = [];
        if (includeNum) required.push(nums[Math.floor(Math.random() * nums.length)]);
        if (includeSym) required.push(syms[Math.floor(Math.random() * syms.length)]);

        for (let i = 0; i < genLength - required.length; i++) {
            pass += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        pass += required.join('');
        pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
        
        setGeneratedPass(pass);
    };

    const useGeneratedPassword = () => {
        setFormData({ ...formData, password: generatedPass });
        setShowGenerator(false);
        setShowPassword(true);
    };

    // Auto-fix URL
    const handleUrlBlur = () => {
        let url = formData.url.trim();
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            setFormData({ ...formData, url });
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData({ ...formData, url: val });
        setIsUrlManuallyEdited(val.length > 0);
    };

    const handleServiceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const lowerName = name.toLowerCase().trim();
        
        let newUrl = formData.url;
        const autoUrl = SERVICE_DOMAINS[lowerName];

        if (autoUrl && (!isUrlManuallyEdited || !newUrl)) {
            newUrl = autoUrl;
        }

        setFormData({
            ...formData, 
            service_name: name,
            url: newUrl
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            addToast('success', "Entry saved successfully");
            onSuccess();
        } catch (error) {
            console.error(error);
            addToast('error', "Failed to save entry");
        } finally {
            setLoading(false);
        }
    };

    return {
        formData,
        setFormData,
        loading,
        showPassword,
        setShowPassword,
        showGenerator,
        setShowGenerator,
        genLength,
        setGenLength,
        includeNum,
        setIncludeNum,
        includeSym,
        setIncludeSym,
        generatedPass,
        generatePassword,
        useGeneratedPassword,
        handleUrlChange,
        handleUrlBlur,
        handleServiceNameChange,
        handleSubmit
    };
};
