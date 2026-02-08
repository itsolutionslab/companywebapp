
import { Service } from "@/types/booking";

export const getServiceImage = (service: Partial<Service>): string | undefined => {
    return service.image_url || undefined;
};
