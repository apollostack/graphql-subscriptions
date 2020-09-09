import { $$asyncIterator } from 'iterall';

export type FilterFn<TSource = any, TContext = any, TArgs = any> = (rootValue?: TSource, args?: TArgs, context?: TContext, info?: any) => boolean | Promise<boolean>;
export type ResolverFn<TSource = any, TContext = any, TArgs = any> = (rootValue?: TSource, args?: TArgs, context?: TContext, info?: any) => AsyncIterator<any>;

interface IterallAsyncIterator<T> extends AsyncIterator<T> {
  [$$asyncIterator](): IterallAsyncIterator<T>;
}

export type WithFilter<TSource = any, TContext = any, TArgs = any> = (
  asyncIteratorFn: ResolverFn<TSource, TContext, TArgs>,
  filterFn: FilterFn<TSource, TContext, TArgs>
) => ResolverFn<TSource, TContext, TArgs>;

export function withFilter<TSource = any, TContext = any, TArgs = any>(
  asyncIteratorFn: ResolverFn<TSource, TContext, TArgs>,
  filterFn: FilterFn<TSource, TContext, TArgs>
): ResolverFn<TSource, TContext, TArgs> {
  return (rootValue: TSource, args: TArgs, context: TContext, info: any): IterallAsyncIterator<any> => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);

    const getNextPromise = () => {
      return asyncIterator
        .next()
        .then(payload => {
          if (payload.done === true) {
            return payload;
          }

          return Promise.resolve(filterFn(payload.value, args, context, info))
            .catch(() => false)
            .then(filterResult => {
              if (filterResult === true) {
                return payload;
              }

              // Skip the current value and wait for the next one
              return getNextPromise();
            });
        });
    };

    return {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return();
      },
      throw(error) {
        return asyncIterator.throw(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };
  };
};
