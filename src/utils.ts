import { ScribeAIResponse, ScribeField, ScribeFieldSuggestion, ScribeFieldTypes } from "./types";

const isVisible = (elem: HTMLElement) => !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length || window.getComputedStyle(elem).visibility !== "hidden") && !elem.closest('[data-scribe-ignore="true"]');

export const scrapeFields = () => {
    const formElement = document.querySelector(`[data-scribe-form="true"]`) as HTMLElement;
    if (!formElement || !isVisible(formElement)) throw Error("Cannot find a scribeable form. Make sure to mark forms with the \"data-scribe-form\" attribute");
    const inputElements = [...formElement.querySelectorAll('input:not([type="submit"]):not([role="combobox"])')].filter(ele => isVisible(ele as HTMLElement)) as HTMLInputElement[];
    const textAreaElements = [...formElement.querySelectorAll('textarea')].filter(ele => isVisible(ele as HTMLElement)) as HTMLTextAreaElement[];
    const selectElements = [...(formElement.querySelectorAll(`select`))].filter(ele => isVisible(ele as HTMLElement)) as HTMLSelectElement[];
    // Care UI (Headless UI) does not use the traditional <select> field for dropdowns.
    const careUISelectElements = [...formElement.querySelectorAll(`[data-cui-listbox]`)].filter(ele => isVisible(ele as HTMLElement));

    const getInputType: (t: string | null) => ScribeField["type"] = (type: string | null) =>
        type && ["string", "number", "date", "datetime-local", "radio", "checkbox"].includes(type) ? type as ScribeField["type"] : "string"


    const inputs: ScribeField[] = inputElements.filter(ele => !["radio", "checkbox"].includes(ele.getAttribute("type") || "")).map((ele) => ({
        type: getInputType(ele.getAttribute("type")),
        fieldElement: ele,
        label: ele.labels?.[0]?.innerText || "",
        value: ele.value
    }))

    const checkBoxesAndRadios: ScribeField[] = Array.from(
        new Map(
            inputElements
                .filter(ele => ["radio", "checkbox"].includes(ele.getAttribute("type") || ""))
                .map((ele) => [
                    ele.getAttribute("name"), // use the `name` attribute as the key
                    {
                        type: getInputType(ele.getAttribute("type")),
                        fieldElement: ele,
                        label: (document.querySelector(`label[for=${ele.getAttribute("name")}]`) as HTMLLabelElement)?.innerText || "",
                        options: [...(document.querySelectorAll(`input[name=${ele.getAttribute("name")}]`) as NodeListOf<HTMLInputElement>)].map((inp) => ({ text: (document.querySelector(`label[for="${inp.id}"]`) as HTMLLabelElement).innerText, value: inp.value })),
                        value: [...(document.querySelectorAll(`input[name=${ele.getAttribute("name")}]`) as NodeListOf<HTMLInputElement>)].find(radio => radio.checked)?.value || null
                    },
                ])
        ).values()
    );

    const textareas: ScribeField[] = textAreaElements.map((ele) => ({
        type: "string",
        fieldElement: ele,
        label: ele.labels?.[0]?.innerText || "",
        value: ele.value,
        customPrompt: ele.getAttribute("data-scribe-prompt") || undefined,
        customExample: ele.getAttribute("data-scribe-example") || undefined
    }))

    const selects: ScribeField[] = selectElements.map((ele) => ({
        type: "select",
        fieldElement: ele,
        label: ele.labels?.[0]?.innerText || "",
        options: [...ele.querySelectorAll("option")].map((option) => ({
            value: option?.value || "",
            text: option?.innerText
        })),
        value: ele.value,
        customPrompt: ele.getAttribute("data-scribe-prompt") || undefined,
        customExample: ele.getAttribute("data-scribe-example") || undefined
    }))

    const cuiSelects: ScribeField[] = careUISelectElements.map((ele) => ({
        type: "cui-select",
        fieldElement: ele,
        label: (ele.parentElement?.parentElement?.querySelector("label:not([data-headlessui-state])") as HTMLLabelElement)?.innerText,
        options: (JSON.parse(ele.getAttribute("data-cui-listbox-options") || "[]") as [string, string][]).map(([value, text]) => ({ text, value })),
        value: JSON.parse(ele.getAttribute("data-cui-listbox-value") || `""`),
        customPrompt: ele.getAttribute("data-scribe-prompt") || undefined,
        customExample: ele.getAttribute("data-scribe-example") || undefined
    }))

    const fields = [
        ...inputs,
        ...textareas,
        ...selects,
        ...cuiSelects,
        ...checkBoxesAndRadios
    ]

    return fields;
}

export const getFieldsToReview = (aiResponse: ScribeAIResponse, scrapedFields: ScribeField[]) => {
    return scrapedFields.map((f, i) => ({ ...f, newValue: aiResponse[i] })).filter(f => f.newValue);
}

export const renderFieldValue = (
    field: ScribeFieldSuggestion,
    useNewValue?: boolean,
) => {
    if (!["string", "number"].includes(typeof field.value))
        return "N/A";
    return field.options
        ? field.options.find(
            (o) => o.value === (useNewValue ? field.newValue : field.value),
        )?.text
        : ((useNewValue ? field.newValue : field.value) as string | number);
};

export const sleep = async (seconds: number) => {
    await new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, seconds);
    });
}

export const updateFieldValue = (field: ScribeFieldSuggestion, useNewValue?: boolean) => {
    const val = (useNewValue ? field.newValue : field.value) as string;
    const element = field.fieldElement as HTMLElement;
    switch (field.type) {
        case "cui-select":
            element.setAttribute("data-cui-listbox-value", JSON.stringify(val || ""));
            break;

        default:
            console.log("Updating to", val);
            (field.fieldElement as HTMLInputElement).value = val as string;
    }
}

export const SCRIBE_PROMPT_MAP: { [key in ScribeFieldTypes | "default"]?: { prompt: string, example: string } } = {
    default: {
        prompt: "A normal string value",
        example: "A value"
    },
    date: {
        prompt: "A date value",
        example: "2003-12-21"
    },
    "datetime-local": {
        prompt: "A date time value",
        example: "2003-12-21T23:10"
    },
    number: {
        prompt: "An integer value",
        example: "42"
    }
}