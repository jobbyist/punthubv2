import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { faqs } from "@/lib/mock-data";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Centre | Puntr" },
      {
        name: "description",
        content:
          "Get help with Puntr: FAQs, live chat, email support@punthub.fun or call 012 880 6560. We're here to help.",
      },
      { property: "og:title", content: "Puntr Support Centre" },
      { property: "og:description", content: "Find answers, get in touch and we'll sort you out." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Puntr",
          url: "https://punthubv2.lovable.app/",
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer support",
              telephone: "+27128806560",
              email: "support@punthub.fun",
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
  }),
  component: Support,
});

function Support() {
  return (
    <AppShell>
      <PageHeading title="Support Centre" subtitle="We're here to help. Find answers, get in touch and we'll sort you out." />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Mail className="size-5" />
          </span>
          <p className="mt-3 font-semibold">Email Us</p>
          <a href="mailto:support@punthub.fun" className="text-sm text-primary">
            support@punthub.fun
          </a>
          <p className="mt-2 text-xs text-muted-foreground">We usually reply within 24 hours</p>
        </div>
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Phone className="size-5" />
          </span>
          <p className="mt-3 font-semibold">Call Us</p>
          <a href="tel:0128806560" className="text-sm text-primary tnum">
            012 880 6560
          </a>
          <p className="mt-2 text-xs text-muted-foreground">Mon – Fri: 08:00 – 18:00 · Sat – Sun: 09:00 – 16:00</p>
        </div>
        <div className="card-surface p-5 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <MessageSquare className="size-5" />
          </span>
          <p className="mt-3 font-semibold">Live Chat</p>
          <p className="text-sm text-muted-foreground">Chat with our support team in real time.</p>
          <span className="mt-2 inline-block rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
            Online 9am – 9pm
          </span>
        </div>
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="mt-3">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">Contact Us</h2>
        <p className="mt-1 text-sm text-muted-foreground">Send us a message and we'll get back to you as soon as possible.</p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Message sent", { description: "Our team will reply within 24 hours." });
            (e.target as HTMLFormElement).reset();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full Name</Label>
            <Input id="s-name" required placeholder="Enter your full name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email Address</Label>
            <Input id="s-email" type="email" required placeholder="Enter your email address" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-subject">Subject</Label>
            <Input id="s-subject" required placeholder="What is your message about?" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-msg">Message</Label>
            <Textarea id="s-msg" required rows={5} maxLength={1000} placeholder="Type your message here..." />
          </div>
          <Button type="submit" className="sm:w-fit">
            Send Message
          </Button>
        </form>
      </section>
    </AppShell>
  );
}
