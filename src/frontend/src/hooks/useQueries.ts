import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type { SensorReading } from "./useSimulation";

export function useGetReadings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["readings"],
    queryFn: async () => {
      if (!actor) return [];
      const raw = await actor.getAllReadings();
      return raw.map((r) => ({
        timestamp: r.timestamp,
        temperature: r.temperature,
        pH: r.pH,
        glucose: r.glucose,
      })) as SensorReading[];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddReading() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reading: SensorReading) => {
      if (!actor) return;
      await actor.addReading({
        timestamp: reading.timestamp,
        temperature: reading.temperature,
        pH: reading.pH,
        glucose: reading.glucose,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });
}
