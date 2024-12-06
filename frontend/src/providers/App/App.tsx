import getLocalStorageApi from 'api/browser/localstorage/get';
import getAllOrgPreferences from 'api/preferences/getAllOrgPreferences';
import { LOCALSTORAGE } from 'constants/localStorage';
import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
import { useGlobalEventListener } from 'hooks/useGlobalEventListener';
import useLicense from 'hooks/useLicense';
import useGetUser from 'hooks/user/useGetUser';
import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
import { FeatureFlagProps as FeatureFlags } from 'types/api/features/getFeaturesFlags';
import { PayloadProps as LicensesResModel } from 'types/api/licenses/getAll';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';
import { Organization } from 'types/api/user/getOrganization';
import { OrgPreference } from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import { IAppContext, IUser } from './types';
import { getUserDefaults } from './utils';

const AppContext = createContext<IAppContext | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	// on load of the provider set the user defaults with access jwt , refresh jwt and user id from local storage
	const [user, setUser] = useState<IUser>(() => getUserDefaults());
	const [licenses, setLicenses] = useState<LicensesResModel | null>(null);
	const [
		activeLicenseV3,
		setActiveLicenseV3,
	] = useState<LicenseV3ResModel | null>(null);
	const [featureFlags, setFeatureFlags] = useState<FeatureFlags[] | null>(null);
	const [orgPreferences, setOrgPreferences] = useState<OrgPreference[] | null>(
		null,
	);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
		(): boolean => getLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN) === 'true',
	);
	const [org, setOrg] = useState<Organization[] | null>(null);

	// fetcher for user
	// user will only be fetched if the user id and token is present
	// if logged out and trying to hit any route none of these calls will trigger
	const {
		data: userData,
		isFetching: isFetchingUser,
		error: userFetchError,
	} = useGetUser(user.id, isLoggedIn);
	useEffect(() => {
		if (!isFetchingUser && userData && userData.payload) {
			setUser((prev) => ({
				...prev,
				...userData.payload,
			}));
			setOrg((prev) => {
				if (!prev) {
					// if no org is present enter a new entry
					return [
						{
							createdAt: 0,
							hasOptedUpdates: false,
							id: userData.payload.orgId,
							isAnonymous: false,
							name: userData.payload.organization,
						},
					];
				}
				// else mutate the existing entry
				const orgIndex = prev.findIndex((e) => e.id === userData.payload.orgId);
				const updatedOrg: Organization[] = [
					...prev.slice(0, orgIndex),
					{
						createdAt: 0,
						hasOptedUpdates: false,
						id: userData.payload.orgId,
						isAnonymous: false,
						name: userData.payload.organization,
					},
					...prev.slice(orgIndex + 1, prev.length),
				];
				return updatedOrg;
			});
		}
	}, [userData, isFetchingUser]);

	// fetcher for licenses v2
	// license will be fetched if we are in logged in state
	const {
		data: licenseData,
		isFetching: isFetchingLicenses,
		error: licensesFetchError,
	} = useLicense(isLoggedIn);
	useEffect(() => {
		if (!isFetchingLicenses && licenseData && licenseData.payload) {
			setLicenses(licenseData.payload);
		}
	}, [licenseData, isFetchingLicenses]);

	// fetcher for licenses v3
	const {
		data: activeLicenseV3Data,
		isFetching: isFetchingActiveLicenseV3,
		error: activeLicenseV3FetchError,
	} = useActiveLicenseV3(isLoggedIn);
	useEffect(() => {
		if (
			!isFetchingActiveLicenseV3 &&
			activeLicenseV3Data &&
			activeLicenseV3Data.payload
		) {
			setActiveLicenseV3(activeLicenseV3Data.payload);
		}
	}, [activeLicenseV3Data, isFetchingActiveLicenseV3]);

	// fetcher for feature flags
	const {
		isFetching: isFetchingFeatureFlags,
		error: featureFlagsFetchError,
	} = useGetFeatureFlag((allFlags: FeatureFlags[]) => {
		setFeatureFlags(allFlags);
	}, isLoggedIn);

	// now since org preferences data is dependent on user being loaded as well so we added extra safety net for user.email to be set as well
	const {
		data: orgPreferencesData,
		isFetching: isFetchingOrgPreferences,
		error: orgPreferencesFetchError,
	} = useQuery({
		queryFn: () => getAllOrgPreferences(),
		queryKey: ['getOrgPreferences'],
		enabled: !!isLoggedIn && !!user.email && user.role === USER_ROLES.ADMIN,
	});

	useEffect(() => {
		if (
			!isFetchingOrgPreferences &&
			orgPreferencesData &&
			orgPreferencesData.payload
		) {
			setOrgPreferences(orgPreferencesData.payload.data);
		}
	}, [orgPreferencesData, isFetchingOrgPreferences]);

	// global event listener for AFTER_LOGIN event to start the user fetch post all actions are complete
	useGlobalEventListener('AFTER_LOGIN', (event) => {
		if (event.detail) {
			setUser((prev) => ({
				...prev,
				accessJwt: event.detail.accessJWT,
				refreshJwt: event.detail.refreshJWT,
				id: event.detail.id,
			}));
			setIsLoggedIn(true);
		}
	});

	// global event listener for LOGOUT event to clean the app context state
	useGlobalEventListener('LOGOUT', () => {
		setIsLoggedIn(false);
		setUser(getUserDefaults());
		setActiveLicenseV3(null);
		setLicenses(null);
		setFeatureFlags(null);
		setOrgPreferences(null);
		setOrg(null);
	});

	// return value for the context
	const value: IAppContext = useMemo(
		() => ({
			activeLicenseV3,
			isFetchingActiveLicenseV3,
			activeLicenseV3FetchError,
			user,
			org,
			isFetchingUser,
			userFetchError,
			licenses,
			isFetchingLicenses,
			licensesFetchError,
			featureFlags,
			isFetchingFeatureFlags,
			featureFlagsFetchError,
			orgPreferences,
			isFetchingOrgPreferences,
			orgPreferencesFetchError,
			isLoggedIn,
		}),
		[
			activeLicenseV3,
			activeLicenseV3FetchError,
			featureFlags,
			featureFlagsFetchError,
			isFetchingActiveLicenseV3,
			isFetchingFeatureFlags,
			isFetchingLicenses,
			isFetchingOrgPreferences,
			isFetchingUser,
			isLoggedIn,
			licenses,
			licensesFetchError,
			org,
			orgPreferences,
			orgPreferencesFetchError,
			user,
			userFetchError,
		],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = (): IAppContext => {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error('useAppContext must be used within an AppProvider');
	}
	return context;
};
