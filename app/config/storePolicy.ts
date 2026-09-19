import { Platform } from 'react-native';

// On iOS the app never collects or describes an external payment for course or
// paid live-session access (App Store Review Guideline 3.1.1). Students only send
// a join request; the academy reviews it and grants access on approval.
export const REQUEST_ONLY = Platform.OS === 'ios';
