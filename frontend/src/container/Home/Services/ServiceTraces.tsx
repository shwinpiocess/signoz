import { Button, Skeleton, Table } from 'antd';
import { useQueryService } from 'hooks/useQueryService';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';

import { columns } from './constants';

export default function ServiceTraces(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [servicesList, setServicesList] = useState<ServicesList[]>([]);

	// Fetch Services
	const {
		data: services,
		isLoading: isServicesLoading,
		isFetching: isServicesFetching,
		isError: isServicesError,
	} = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags: [],
	});

	useEffect(() => {
		setServicesList(services || []);
	}, [services]);

	const servicesExist = servicesList?.length > 0;
	const top5Services = servicesList?.slice(0, 5);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/triangle-ruler.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">You are not sending traces yet.</div>

					<div className="empty-description">
						Start sending traces to see your services.
					</div>
				</div>

				<div className="empty-actions-container">
					<Button type="default" className="periscope-btn secondary">
						Get Started &nbsp; <ArrowRight size={16} />
					</Button>

					<Button type="link" className="learn-more-link">
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	const renderDashboardsList = (): JSX.Element => (
		<div className="services-list-container home-data-item-container">
			<div className="services-list">
				<Table<ServicesList>
					columns={columns}
					dataSource={top5Services}
					pagination={false}
					className="services-table"
				/>
			</div>
		</div>
	);

	if (isServicesLoading || isServicesFetching) {
		<Card className="dashboards-list-card home-data-card">
			<Card.Content>
				<Skeleton active />
			</Card.Content>
		</Card>;
	}

	if (isServicesError) {
		return (
			<Card className="dashboards-list-card home-data-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	return (
		<Card className="dashboards-list-card home-data-card">
			{servicesExist && (
				<Card.Header>
					<div className="services-header home-data-card-header"> Services </div>
				</Card.Header>
			)}
			<Card.Content>
				{servicesExist ? renderDashboardsList() : emptyStateCard()}
			</Card.Content>

			{servicesExist && (
				<Card.Footer>
					<div className="services-footer home-data-card-footer">
						<Button type="link" className="periscope-btn link learn-more-link">
							All Services <ArrowRight size={12} />
						</Button>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
