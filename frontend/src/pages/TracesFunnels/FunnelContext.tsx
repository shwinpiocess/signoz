import { ValidateFunnelResponse } from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useValidateFunnelSteps } from 'hooks/TracesFunnels/useFunnels';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
import {
	createContext,
	Dispatch,
	SetStateAction,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 } from 'uuid';

interface FunnelContextType {
	startTime: number;
	endTime: number;
	selectedTime: CustomTimeType | Time | TimeV2;
	validTracesCount: number;
	funnelId: string;
	steps: FunnelStepData[];
	setSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
	initialSteps: FunnelStepData[];
	handleAddStep: () => void;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
	handleStepRemoval: (index: number) => void;
	handleRunFunnel: () => void;
	validationResponse:
		| SuccessResponse<ValidateFunnelResponse>
		| ErrorResponse
		| undefined;
	isValidateStepsLoading: boolean;
	hasIncompleteStepFields: boolean;
	setHasIncompleteStepFields: Dispatch<SetStateAction<boolean>>;
	hasAllEmptyStepFields: boolean;
	setHasAllEmptyStepFields: Dispatch<SetStateAction<boolean>>;
}

const FunnelContext = createContext<FunnelContextType | undefined>(undefined);

export function FunnelProvider({
	children,
	funnelId,
}: {
	children: React.ReactNode;
	funnelId: string;
}): JSX.Element {
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: selectedTime,
	});

	const startTime = Math.floor(Number(start) * 1e9);
	const endTime = Math.floor(Number(end) * 1e9);

	const queryClient = useQueryClient();
	const data = queryClient.getQueryData<{ payload: FunnelData }>([
		REACT_QUERY_KEY.GET_FUNNEL_DETAILS,
		funnelId,
	]);
	const funnel = data?.payload;
	const initialSteps = funnel?.steps?.length ? funnel.steps : initialStepsData;
	const [steps, setSteps] = useState<FunnelStepData[]>(initialSteps);
	const [hasIncompleteStepFields, setHasIncompleteStepFields] = useState(
		steps.some((step) => step.service_name === '' || step.span_name === ''),
	);
	const [hasAllEmptyStepFields, setHasAllEmptyStepFields] = useState(
		steps.every((step) => step.service_name === '' && step.span_name === ''),
	);
	const {
		data: validationResponse,
		isLoading: isValidationLoading,
		isFetching: isValidationFetching,
	} = useValidateFunnelSteps({
		funnelId,
		selectedTime,
		startTime,
		endTime,
	});

	const validTracesCount = useMemo(
		() => validationResponse?.payload?.data?.length || 0,
		[validationResponse],
	);

	// Step modifications
	const handleStepUpdate = useCallback(
		(index: number, newStep: Partial<FunnelStepData>) => {
			setSteps((prev) =>
				prev.map((step, i) => (i === index ? { ...step, ...newStep } : step)),
			);
		},
		[],
	);

	const addNewStep = useCallback(() => {
		setSteps((prev) => [
			...prev,
			{
				...initialStepsData[0],
				id: v4(),
				step_order: prev.length + 1,
			},
		]);
	}, []);

	const handleStepRemoval = useCallback((index: number) => {
		setSteps((prev) =>
			prev
				// remove the step in the index
				.filter((_, i) => i !== index)
				// reset the step_order for the remaining steps
				.map((step, newIndex) => ({
					...step,
					step_order: newIndex + 1,
				})),
		);
	}, []);

	if (!funnelId) {
		throw new Error('Funnel ID is required');
	}

	const handleRunFunnel = useCallback(async (): Promise<void> => {
		if (validTracesCount === 0) return;
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_OVERVIEW,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_ERROR_TRACES,
			funnelId,
			selectedTime,
		]);
		queryClient.refetchQueries([
			REACT_QUERY_KEY.GET_FUNNEL_SLOW_TRACES,
			funnelId,
			selectedTime,
		]);
	}, [funnelId, queryClient, selectedTime, validTracesCount]);

	const value = useMemo<FunnelContextType>(
		() => ({
			funnelId,
			startTime,
			endTime,
			validTracesCount,
			selectedTime,
			steps,
			setSteps,
			initialSteps,
			handleStepChange: handleStepUpdate,
			handleAddStep: addNewStep,
			handleStepRemoval,
			handleRunFunnel,
			validationResponse,
			isValidateStepsLoading: isValidationLoading || isValidationFetching,
			hasIncompleteStepFields,
			setHasIncompleteStepFields,
			hasAllEmptyStepFields,
			setHasAllEmptyStepFields,
		}),
		[
			funnelId,
			startTime,
			endTime,
			validTracesCount,
			selectedTime,
			steps,
			initialSteps,
			handleStepUpdate,
			addNewStep,
			handleStepRemoval,
			handleRunFunnel,
			validationResponse,
			isValidationLoading,
			isValidationFetching,
			hasIncompleteStepFields,
			setHasIncompleteStepFields,
			hasAllEmptyStepFields,
			setHasAllEmptyStepFields,
		],
	);

	return (
		<FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
	);
}

export function useFunnelContext(): FunnelContextType {
	const context = useContext(FunnelContext);
	if (context === undefined) {
		throw new Error('useFunnelContext must be used within a FunnelProvider');
	}
	return context;
}
