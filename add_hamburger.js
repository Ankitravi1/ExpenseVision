const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'mobile', 'src', 'screens', 'main');
const screens = [
    'BudgetsScreen.tsx',
    'TransactionsScreen.tsx',
    'AccountsScreen.tsx',
    'ReportsScreen.tsx',
    'CategoriesScreen.tsx',
    'RecurringScreen.tsx',
    'SettingsScreen.tsx'
];

screens.forEach(screen => {
    const filePath = path.join(screensDir, screen);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has openDrawer
    if (content.includes('openDrawer')) {
        console.log(`Skipping ${screen} - already has openDrawer`);
        return;
    }

    // Add navigation import if needed
    if (!content.includes(`useNavigation`)) {
        content = content.replace(
            `import { useTheme } from '../../context/ThemeContext';`,
            `import { useTheme } from '../../context/ThemeContext';\nimport { useNavigation } from '@react-navigation/native';`
        );
    }
    
    // Add useNavigation hook inside the component
    // Search for export default function Name() {
    const functionRegex = /(export default function \w+\(\) {\s*)/;
    content = content.replace(functionRegex, `$1const navigation = useNavigation();\n    `);

    // Replace <Text style={[styles.title, { color: theme.colors.text }]}>Title</Text>
    const titleRegex = /(<Text style={\[styles\.title, \{ color: theme\.colors\.text \}\]}>.*?<\/Text>)/;
    
    const replacement = `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => (navigation as any).openDrawer?.()}
                        style={{ marginRight: 12, padding: 4 }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    $1
                </View>`;

    content = content.replace(titleRegex, replacement);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${screen}`);
});
