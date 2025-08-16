import React from 'react';
import { Container } from '@mui/material';
import GlobalPermissionPolicyManager from '../components/GlobalPermissionPolicyManager';

const PermissionPolicyManagement: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      <GlobalPermissionPolicyManager />
    </Container>
  );
};

export default PermissionPolicyManagement;
