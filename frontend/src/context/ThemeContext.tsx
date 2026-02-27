import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getTheme, Theme } from '../utils/themes';
import { getHeaderCategoriesPublic, HeaderCategory } from '../services/api/headerCategoryService';

interface ThemeContextType {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    currentTheme: Theme;
    headerCategories: HeaderCategory[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await getHeaderCategoriesPublic(true);
                setHeaderCategories(cats);
            } catch (error) {
                console.error('Failed to fetch header categories in ThemeContext', error);
            }
        };
        fetchCategories();
    }, []);

    // Find active header category to get its custom theme
    const activeHeaderCat = headerCategories.find(c => c.slug === activeCategory);
    const themeKey = activeHeaderCat?.theme || activeCategory;
    const currentTheme = getTheme(themeKey);

    return (
        <ThemeContext.Provider value={{ activeCategory, setActiveCategory, currentTheme, headerCategories }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}
