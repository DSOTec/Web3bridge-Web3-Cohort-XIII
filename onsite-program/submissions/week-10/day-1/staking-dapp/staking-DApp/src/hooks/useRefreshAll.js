import { useStakingPositions } from "./useStakingPositions";
import { useStaking } from "./useStaking";
import { useRewards } from "./useRewards";
import { useProtocolStats } from "./useProtocolStats";

export function useRefetchAll() {
    const { refresh: refreshPositions } = useStakingPositions();
    const { refresh: refreshStaking } = useStaking();
    const { refresh: refreshRewards } = useRewards();
    const { refresh: refreshStats } = useProtocolStats();

    const refetchAll = async () => {
        await Promise.all([
            refreshPositions(),
            refreshStaking(),
            refreshRewards(),
            refreshStats(),
        ]);
    };

    return { refetchAll };
}
