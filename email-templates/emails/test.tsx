import { Text } from '@react-email/components';
import { BaseTemplate } from '../components/base-template';
import CardHeader from '../components/card-header';
import { sharedPreviewProps, sharedTemplateProps } from '../props';

interface TestEmailProps {
  logoURL: string;
  appURL: string;
}

export const TestEmail = ({ logoURL, appURL }: TestEmailProps) => (
  <BaseTemplate logoURL={logoURL} appURL={appURL}>
    <CardHeader title="Test Email" />
    <Text style={textStyle}>Your email setup is working correctly!</Text>
  </BaseTemplate>
);

export default TestEmail;

const textStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#cbd5e1',
  marginTop: '16px',
  marginBottom: '0',
};

TestEmail.TemplateProps = {
  ...sharedTemplateProps,
};

TestEmail.PreviewProps = {
  ...sharedPreviewProps,
};
