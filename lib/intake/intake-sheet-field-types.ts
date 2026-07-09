export type IntakeSheetFieldKind = "text" | "date" | "number" | "enum";

export type IntakeSheetEnumOption = {
  readonly id: string;
  readonly label: string;
};

export type IntakeSheetField = {
  readonly id: string;
  readonly gapId: string;
  readonly kind: IntakeSheetFieldKind;
  readonly label: string;
  readonly placeholder?: string;
  readonly value: string | number;
  readonly min?: number;
  readonly max?: number;
  readonly enumOptions?: readonly IntakeSheetEnumOption[];
};
