module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                es6: true,
                node: true,
                mocha: true
            }
        },
        rules: {
            'indent': [
                'error',
                4,
                {
                    'SwitchCase': 1
                }
            ],
            'no-console': 'off',
            'no-var': 'error',
            'no-trailing-spaces': 'error',
            'prefer-const': 'error',
            'quotes': [
                'error',
                'single',
                {
                    'avoidEscape': true,
                    'allowTemplateLiterals': true
                }
            ],
            'semi': [
                'error',
                'always'
            ]
        }
    }
];
