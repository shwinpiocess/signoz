import './TracesFunnelDetails.styles.scss';

import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import { NotFoundContainer } from 'container/GridCardLayout/GridCard/FullView/styles';
import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

function TracesFunnelDetails(): JSX.Element {
	const [validTracesCount, setValidTracesCount] = useState(0);
	const { funnelId } = useParams<{ funnelId: string }>();
	const { data, isLoading, isError } = useFunnelDetails({ funnelId });

	if (isLoading || !data?.payload) {
		return <Spinner size="large" tip="Loading..." />;
	}

	if (isError) {
		return (
			<NotFoundContainer>
				<Typography>Error loading funnel details</Typography>
			</NotFoundContainer>
		);
	}

	return (
		<div className="traces-funnel-details">
			<div className="traces-funnel-details__steps-config">
				<FunnelConfiguration
					funnel={data.payload}
					validTracesCount={validTracesCount}
					setValidTracesCount={setValidTracesCount}
				/>
			</div>
			<div className="traces-funnel-details__steps-results">
				<FunnelResults funnel={data.payload} validTracesCount={validTracesCount} />
			</div>
		</div>
	);
}

export default TracesFunnelDetails;
