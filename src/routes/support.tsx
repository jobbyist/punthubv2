import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/support")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "support");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/support" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Puntr",
            url: "https://puntr.co.za/",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                telephone: "+27128806560",
                email: "support@puntr.co.za",
                areaServed: "ZA",
                availableLanguage: ["en"],
                hoursAvailable: [
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    opens: "08:00",
                    closes: "18:00",
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: ["Saturday", "Sunday"],
                    opens: "09:00",
                    closes: "16:00",
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: Support,
});

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

function Support() {
  const { t } = useTranslation("support");
  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Mail className="size-5" />
          </span>
          <p className="mt-3 font-semibold">{t("email.title")}</p>
          <a href="mailto:support@puntr.co.za" className="text-sm text-primary">
            support@puntr.co.za
          </a>
          <p className="mt-2 text-xs text-muted-foreground">{t("email.note")}</p>
        </div>
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Phone className="size-5" />
          </span>
          <p className="mt-3 font-semibold">{t("phone.title")}</p>
          <a href="tel:+27128806560" className="text-sm text-primary tnum">
            {t("phone.display")}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">{t("phone.hours")}</p>
        </div>
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <MessageSquare className="size-5" />
          </span>
          <p className="mt-3 font-semibold">{t("chat.title")}</p>
          <p className="text-sm text-muted-foreground">{t("chat.body")}</p>
          <span className="mt-2 inline-block rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
            {t("chat.badge")}
          </span>
        </div>
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">{t("faq.title")}</h2>
        <Accordion type="single" collapsible className="mt-3">
          {FAQ_KEYS.map((n) => (
            <AccordionItem key={n} value={`q${n}`}>
              <AccordionTrigger className="text-left text-sm">{t(`faq.q${n}`)}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {t(`faq.a${n}`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">{t("contact.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("contact.body")}</p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success(t("contact.toastTitle"), { description: t("contact.toastBody") });
            (e.target as HTMLFormElement).reset();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="s-name">{t("contact.name")}</Label>
            <Input id="s-name" required placeholder={t("contact.namePh")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">{t("contact.email")}</Label>
            <Input id="s-email" type="email" required placeholder={t("contact.emailPh")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-subject">{t("contact.subject")}</Label>
            <Input id="s-subject" required placeholder={t("contact.subjectPh")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-msg">{t("contact.message")}</Label>
            <Textarea
              id="s-msg"
              required
              rows={5}
              maxLength={1000}
              placeholder={t("contact.messagePh")}
            />
          </div>
          <Button type="submit" className="sm:w-fit">
            {t("contact.submit")}
          </Button>
        </form>
      </section>
    </AppShell>
  );
}
