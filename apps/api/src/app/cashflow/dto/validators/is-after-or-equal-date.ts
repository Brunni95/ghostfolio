import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { isAfter, isEqual, parseISO } from 'date-fns';

export function IsAfterOrEqualDate(
  property: string,
  validationOptions?: ValidationOptions
) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'isAfterOrEqualDate',
      options: validationOptions,
      propertyName,
      target: object.constructor,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!value) {
            return true;
          }

          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, any>)[
            relatedPropertyName
          ];

          if (!relatedValue) {
            return true;
          }

          try {
            const currentDate =
              value instanceof Date ? value : parseISO(String(value));
            const relatedDate =
              relatedValue instanceof Date
                ? relatedValue
                : parseISO(String(relatedValue));

            return isAfter(currentDate, relatedDate) || isEqual(currentDate, relatedDate);
          } catch {
            return false;
          }
        }
      }
    });
  };
}
