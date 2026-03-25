import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>{t("madeWith")}</p>
        <p>
          &copy; {year} Cafe Le Den. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
