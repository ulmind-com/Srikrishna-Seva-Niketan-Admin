import { endpoints } from "./api/endpoints";
import { apiRequest } from "./api/client";
import { rawClient } from "./api/client";

export interface ICServiceItem {
  title: string;
  description: string;
  order: number;
}

export interface ICWhyChooseItem {
  title: string;
  description: string;
}

export interface ICHowItWorksStep {
  step_label: string;
  title: string;
  description: string;
}

export interface ICFaqItem {
  question: string;
  answer: string;
}

export interface InfectionControlContent {
  id: string;
  hero_heading: string;
  hero_subheading: string;
  hero_short_text: string;
  hero_btn_primary: string;
  hero_btn_secondary: string;
  intro_heading: string;
  intro_content: string;
  services: ICServiceItem[];
  why_choose_items: ICWhyChooseItem[];
  how_it_works_steps: ICHowItWorksStep[];
  faqs: ICFaqItem[];
  enquiry_heading: string;
  enquiry_subheading: string;
  enquiry_requirement_options: string[];
  home_card_title: string;
  home_card_description: string;
  home_card_button_text: string;
  created_at?: string;
  updated_at?: string;
}

export interface InfectionControlEnquiry {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  requirement_type: string;
  message?: string | null;
  status: string;
  created_at: string;
}

export const infectionControlService = {
  getContent: () =>
    apiRequest<InfectionControlContent>({
      method: "GET",
      url: endpoints.infectionControl.content,
    }),

  updateContent: (data: Partial<InfectionControlContent>) =>
    apiRequest<InfectionControlContent>({
      method: "PUT",
      url: endpoints.infectionControl.content,
      data,
    }),

  listEnquiries: (params?: { page?: number; page_size?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return rawClient.get(
      `${endpoints.infectionControl.enquiries}${qs ? `?${qs}` : ""}`
    );
  },

  updateEnquiryStatus: (id: string, status: string) =>
    rawClient.patch(endpoints.infectionControl.enquiry(id), { status }),
};
