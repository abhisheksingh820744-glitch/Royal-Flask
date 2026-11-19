import { flatRecommended } from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '.backup_pre_security_hardening/**/*'],
  },
  flatRecommended,
];
