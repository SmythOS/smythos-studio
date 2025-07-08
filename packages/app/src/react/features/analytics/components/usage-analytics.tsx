import StackedBarChart from '@react/features/analytics/components/stacked-bar-chart';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { Button } from '@src/react/shared/components/ui/button';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function UsageAnalytics({
  isLoading,
  allSpaces,
  selectedSpace,
  setSelectedSpace,
  allAgents,
  selectedAgent,
  setSelectedAgent,
  chartData,
  totalUsage,
  selectedMonth,
  setSelectedMonth,
  handleExport,
  showSpacesDropdown,
}: {
  isLoading: boolean;
  allSpaces: Array<{ id: string; name: string }>;
  selectedSpace: { id: string; name: string };
  setSelectedSpace: (arg: string) => void;
  allAgents: Array<any>;
  selectedAgent: { id: string; name: string };
  setSelectedAgent: (arg: string) => void;
  chartData: any;
  totalUsage: number | null;
  selectedMonth: any;
  setSelectedMonth: (arg: number) => void;
  handleExport: () => void;
  showSpacesDropdown: boolean;
}) {
  const {
    userInfo: { subs: userSubs },
  } = useAuthCtx();

  return (
    <div className="mx-auto pl-12 md:pl-0">
      <div className="rounded-lg bg-white pr-1 md:pr-0">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[24px] font-semibold text-black">Model Usage</h1>

          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row">
            {showSpacesDropdown && (
              <Select
                value={selectedSpace.id}
                onValueChange={(spaceId) => setSelectedSpace(spaceId)}
              >
                <SelectTrigger className="w-full lg:w-[180px] h-[44px]">
                  <SelectValue placeholder="All team spaces">{selectedSpace.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allSpaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedAgent.id} onValueChange={(agentId) => setSelectedAgent(agentId)}>
              <SelectTrigger className="w-full lg:w-[140px] h-[44px]">
                <SelectValue placeholder="All Agents">{selectedAgent.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="flex items-center gap-1 px-3 font-normal w-full sm:w-auto h-[44px]"
            >
              <ChevronLeft
                className="h-4 w-4 text-gray-500 cursor-pointer"
                onClick={() => setSelectedMonth(-1)}
              />
              <span>
                {selectedMonth
                  ? selectedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'Select Date'}
              </span>
              <ChevronRight
                className="h-4 w-4 text-gray-500 cursor-pointer"
                onClick={() => setSelectedMonth(1)}
              />
            </Button>

            <CustomButton
              variant="primary"
              handleClick={handleExport}
              label="Export"
              addIcon
              Icon={<Download className="h-4 w-4 mr-2" />}
            />
          </div>
        </div>

        {totalUsage !== null && userSubs?.plan?.properties?.flags?.modelCostMultiplier && (
          <div className="w-full lg:w-max bg-white rounded-[16px] px-5 py-4 border-[1px] border-solid border-gray-200 mb-6">
            <h2 className="text-[13px] font-normal text-[#6B7280]">Total Model Usage</h2>
            <p className="text-[32px] font-semibold text-black mt-1">${totalUsage.toFixed(5)}</p>
          </div>
        )}

        <div className="mb-4 bg-white rounded-[16px] px-5 py-4 border-[1px] border-solid border-gray-200">
          <h3 className="mb-4 text-sm font-medium">Daily Model Usage</h3>
          {isLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <Spinner classes="w-8 h-8" />
            </div>
          ) : (
            <StackedBarChart chartData={chartData} />
          )}
        </div>

        <p className="text-[13px] leading-5 text-[#6B7280] mt-6">
          SmythOS provides API keys for many AI models for your convenience. When you use our
          models, you pay SmythOS instead of the AI model provider. See{' '}
          <a href={`${SMYTHOS_DOCS_URL}/account-management/model-rates`} className="underline">
            documentation
          </a>
          .
          <br />
          <span className="text-[#9CA3AF]">
            Whenever you bring your own API keys in the vault, cost will not be tracked here, but by
            your AI or API model provider instead.
          </span>
        </p>
      </div>
    </div>
  );
}
